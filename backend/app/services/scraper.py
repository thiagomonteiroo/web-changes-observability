import hashlib
import re
import urllib.parse
from typing import Optional, List, Dict, Any, Tuple
import httpx
from bs4 import BeautifulSoup, Comment
from app.core.config import settings

class ScraperService:
    @staticmethod
    async def fetch_page(url: str, timeout: int = settings.DEFAULT_REQUEST_TIMEOUT_SECONDS) -> Tuple[str, int, int]:
        """
        Fetches the HTML content of a URL.
        Returns: (html_content, http_status_code, response_time_ms)
        """
        headers = {
            "User-Agent": settings.DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }
        
        # In state/government websites, SSL certificates or redirects might be tricky.
        # We allow redirects and verify=False fallback if needed, but default to standard verification.
        transport = httpx.AsyncHTTPTransport(retries=2)
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=timeout, transport=transport, verify=False) as client:
            import time
            start = time.time()
            response = await client.get(url)
            elapsed_ms = int((time.time() - start) * 1000)
            response.raise_for_status()
            return response.text, response.status_code, elapsed_ms

    @staticmethod
    def clean_and_extract(
        html: str,
        base_url: str,
        css_selector: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cleans HTML by stripping dynamic ASP.NET tokens (__VIEWSTATE, __EVENTVALIDATION, etc.),
        scripts, styles, comments, and extracts normalized text and document links.
        """
        soup = BeautifulSoup(html, "html.parser")

        # 1. Remove comments
        for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
            comment.extract()

        # 2. Remove script, style, noscript, meta, iframe, svg, head
        for tag in soup(["script", "style", "noscript", "meta", "link", "iframe", "svg"]):
            tag.decompose()

        # 3. CRITICAL for ASP.NET / Government portals: Remove hidden input tokens
        # e.g. __VIEWSTATE, __EVENTVALIDATION, __VIEWSTATEGENERATOR, csrf tokens
        for hidden_input in soup.find_all("input", {"type": "hidden"}):
            hidden_input.decompose()

        # 4. If a CSS selector is specified, narrow down to that target
        target_root = soup
        if css_selector and css_selector.strip():
            matched = soup.select(css_selector.strip())
            if not matched:
                raise ValueError(f"Seletor CSS '{css_selector}' não foi encontrado na página.")
            # Create a container with matched elements
            temp_soup = BeautifulSoup("<div></div>", "html.parser")
            for elem in matched:
                temp_soup.div.append(elem)
            target_root = temp_soup.div

        # 5. Extract document links and publications (e.g. .pdf, .docx, .doc, .xlsx, .zip or anchor texts)
        extracted_links: List[Dict[str, Any]] = []
        doc_extensions = (".pdf", ".docx", ".doc", ".xlsx", ".xls", ".zip", ".rar", ".txt", ".csv")

        for a in target_root.find_all("a", href=True):
            href = a.get("href", "").strip()
            if not href or href.startswith("javascript:") or href.startswith("#"):
                continue

            # Normalize Windows backslashes in hrefs if present (common in ASP.NET portals)
            clean_href = href.replace("\\", "/")
            absolute_url = urllib.parse.urljoin(base_url, clean_href)
            link_text = re.sub(r"\s+", " ", a.get_text()).strip()
            
            # Detect extension or document type
            lower_href = href.lower()
            ext = ""
            for e in doc_extensions:
                if e in lower_href:
                    ext = e.replace(".", "")
                    break

            is_document = bool(ext)
            
            # Only record relevant links
            if is_document or (link_text and len(link_text) > 1):
                extracted_links.append({
                    "title": link_text if link_text else "Sem título",
                    "url": absolute_url,
                    "relative_path": href,
                    "is_document": is_document,
                    "extension": ext or "link"
                })

        # Deduplicate links preserving order
        unique_links: List[Dict[str, Any]] = []
        seen_urls = set()
        for link in extracted_links:
            if link["url"] not in seen_urls:
                seen_urls.add(link["url"])
                unique_links.append(link)

        # 6. Normalize text content
        raw_text = target_root.get_text(separator="\n")
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        cleaned_text = "\n".join(lines)

        # 7. Compute deterministic hash combining cleaned text and sorted links
        hash_payload = cleaned_text + "\n" + "\n".join(sorted(l["url"] for l in unique_links))
        content_hash = hashlib.sha256(hash_payload.encode("utf-8")).hexdigest()

        return {
            "cleaned_text": cleaned_text,
            "extracted_links": unique_links,
            "content_hash": content_hash,
            "text_length": len(cleaned_text),
            "total_links": len(unique_links)
        }
