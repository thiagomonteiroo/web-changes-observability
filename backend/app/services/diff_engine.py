import difflib
from typing import List, Dict, Any, Tuple

class DiffEngine:
    @staticmethod
    def generate_diff(
        old_text: str,
        new_text: str,
        from_label: str = "Versão Anterior",
        to_label: str = "Versão Atual"
    ) -> str:
        """
        Generates unified diff representation.
        """
        old_lines = old_text.splitlines(keepends=True)
        new_lines = new_text.splitlines(keepends=True)

        diff = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=from_label,
            tofile=to_label,
            lineterm=""
        )
        return "\n".join(diff)

    @staticmethod
    def compare_links(
        old_links: List[Dict[str, Any]],
        new_links: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Compares two lists of links to identify added and removed documents/links.
        """
        old_urls = {l["url"]: l for l in old_links if "url" in l}
        new_urls = {l["url"]: l for l in new_links if "url" in l}

        added = [link for url, link in new_urls.items() if url not in old_urls]
        removed = [link for url, link in old_urls.items() if url not in new_urls]

        return added, removed
