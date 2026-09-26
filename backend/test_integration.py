import asyncio
from unittest.mock import patch
import httpx
from httpx import ASGITransport
from app.main import app
from app.core.database import init_db
from app.services.scheduler import scheduler_service
from app.services.scraper import ScraperService

MOCK_HTML_V1 = """
<!DOCTYPE html>
<html>
<head><title>Processo Seletivo</title></head>
<body>
  <h1>Processo Seletivo 2026</h1>
  <p>Status: Inscrições encerradas</p>
  <table id="tabela-publicacoes">
    <tr><th>Documento</th></tr>
    <tr><td><a href="/downloads/edital_abertura.pdf">Edital de Abertura</a></td></tr>
  </table>
</body>
</html>
"""

MOCK_HTML_V2 = """
<!DOCTYPE html>
<html>
<head><title>Processo Seletivo</title></head>
<body>
  <h1>Processo Seletivo 2026</h1>
  <p>Status: Convocação publicada</p>
  <table id="tabela-publicacoes">
    <tr><th>Documento</th></tr>
    <tr><td><a href="/downloads/edital_abertura.pdf">Edital de Abertura</a></td></tr>
    <tr><td><a href="/downloads/resultado_preliminar.pdf">Resultado Preliminar e Convocação</a></td></tr>
  </table>
</body>
</html>
"""

async def run_integration_tests():
    print("=== INICIANDO TESTES DE INTEGRAÇÃO END-TO-END ===")
    
    # 1. Initialize SQLite Database & Scheduler
    await init_db()
    scheduler_service.start()
    print("[1/5] Banco de dados SQLite e Scheduler inicializados.")

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 2. Test Health Endpoint
        res_health = await client.get("/health")
        assert res_health.status_code == 200, f"Health check falhou: {res_health.text}"
        print(f"[2/5] Endpoint /health OK -> {res_health.json()}")

        # 3. Test Preview URL Endpoint with Mock
        target_url = "https://exemplo.gov.br/concursos/edital-2026"
        with patch.object(ScraperService, "fetch_page", return_value=(MOCK_HTML_V1, 200, 120)):
            res_preview = await client.post("/api/monitors/test-url", json={"url": target_url})
            assert res_preview.status_code == 200, f"Test URL falhou: {res_preview.text}"
            preview_data = res_preview.json()
            assert preview_data["success"] is True, f"Preview não teve sucesso: {preview_data}"
            print(f"[3/5] Teste prévio da URL OK -> HTTP {preview_data['status_code']} ({preview_data['response_time_ms']}ms) | Links: {preview_data['total_links_found']}")

            # 4. Create Monitor via POST /api/monitors
            create_payload = {
                "name": "Processo Seletivo Estadual - Exemplo",
                "url": target_url,
                "schedule_type": "daily_multi_times",
                "schedule_config": {
                    "times": ["08:00", "12:00", "16:00", "20:00"]
                }
            }
            res_create = await client.post("/api/monitors", json=create_payload)
            assert res_create.status_code == 200, f"Criação de monitor falhou: {res_create.text}"
            monitor = res_create.json()
            monitor_id = monitor["id"]
            print(f"[4/5] Monitor criado com sucesso! ID={monitor_id}, Status={monitor['last_status']}, Mudanças={monitor['total_changes']}")

            # Verify initial check didn't trigger false unread alarm
            assert monitor["has_unread_change"] is False, "Não deveria haver alteração não lida no snapshot inicial"
            assert monitor["total_changes"] == 0, "Total de mudanças inicial deve ser 0"

            # 5. Check Now without changes -> success_no_change
            res_check1 = await client.post(f"/api/monitors/{monitor_id}/check-now")
            assert res_check1.status_code == 200
            check_data1 = res_check1.json()
            assert check_data1["result"]["status"] == "success_no_change"
            print("[5/5] Checagem sem alterações -> success_no_change OK")

        # 6. Check Now with change (V2) -> success_changed and unread alert
        with patch.object(ScraperService, "fetch_page", return_value=(MOCK_HTML_V2, 200, 110)):
            res_check2 = await client.post(f"/api/monitors/{monitor_id}/check-now")
            assert res_check2.status_code == 200
            check_data2 = res_check2.json()
            assert check_data2["result"]["status"] == "success_changed"
            assert check_data2["monitor"]["total_changes"] == 1
            assert check_data2["monitor"]["has_unread_change"] is True
            print("[*] Detecção de alteração e alerta pendente OK!")

            # Verify Diff was recorded
            res_diffs = await client.get(f"/api/monitors/{monitor_id}/diffs")
            diffs = res_diffs.json()
            assert len(diffs) == 1
            assert len(diffs[0]["added_links"]) == 1
            assert "resultado_preliminar.pdf" in diffs[0]["added_links"][0]["url"]
            print("[*] Diff e novo documento detectado com sucesso!")

            # 7. Acknowledge Change
            res_ack = await client.post(f"/api/monitors/{monitor_id}/acknowledge")
            assert res_ack.status_code == 200
            assert res_ack.json()["monitor"]["has_unread_change"] is False
            print("[*] Confirmação de visualização limpa o alerta com sucesso!")

        # 8. Clean up
        await client.delete(f"/api/monitors/{monitor_id}")

    scheduler_service.shutdown()
    print("\n=== TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO! ===")

if __name__ == "__main__":
    asyncio.run(run_integration_tests())
