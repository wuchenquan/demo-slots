from pathlib import Path

import pdfplumber


pdf_path = Path(r"F:\p\demo slots\Fox_David_Casino_Royale_Meets_Battle_Royale.pdf")
out_path = Path("work/pdf_text_index.txt")

with pdfplumber.open(pdf_path) as pdf:
    chunks = []
    for index, page in enumerate(pdf.pages, 1):
        text = (page.extract_text() or "").strip()
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        chunks.append(f"--- PAGE {index:02d} ---")
        chunks.append("\n".join(lines))
        chunks.append("")

out_path.write_text("\n".join(chunks), encoding="utf-8")
print(f"Wrote {out_path} with {len(chunks)} chunks")
