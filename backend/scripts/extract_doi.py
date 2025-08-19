#!/usr/bin/env python3
"""
Script pour extraire le DOI d'un fichier PDF
Usage: python extract_doi.py <chemin_vers_pdf>
"""

import fitz  # PyMuPDF
import re
import sys
import os

def extract_doi_from_pdf(pdf_path):
    """
    Extrait le DOI d'un fichier PDF en analysant les premières pages
    
    Args:
        pdf_path (str): Chemin vers le fichier PDF
        
    Returns:
        str|None: Le DOI trouvé ou None si aucun DOI n'est trouvé
    """
    try:
        # Vérifier que le fichier existe
        if not os.path.exists(pdf_path):
            print(f"Erreur: Le fichier {pdf_path} n'existe pas", file=sys.stderr)
            return None
            
        # Ouvrir le fichier PDF
        doc = fitz.open(pdf_path)

        # Parcourir les premières pages pour trouver un DOI (souvent sur la première ou deuxième page)
        text_to_search = ""
        max_pages = min(3, len(doc))  # Analyse max 3 premières pages
        
        for page_num in range(max_pages):
            page = doc.load_page(page_num)
            text_to_search += page.get_text()

        # Fermer le document
        doc.close()

        # Expression régulière pour détecter un DOI
        # Pattern amélioré pour capturer différents formats de DOI
        doi_patterns = [
            r'\b10\.\d{4,9}/[^\s"<>\]\)]+',  # DOI standard
            r'doi:\s*10\.\d{4,9}/[^\s"<>\]\)]+',  # DOI avec préfixe "doi:"
            r'DOI:\s*10\.\d{4,9}/[^\s"<>\]\)]+',  # DOI avec préfixe "DOI:"
        ]
        
        for pattern in doi_patterns:
            matches = re.findall(pattern, text_to_search, re.IGNORECASE)
            if matches:
                # Nettoyer le DOI (enlever les préfixes et caractères indésirables)
                doi = matches[0]
                
                # Enlever les préfixes
                doi = re.sub(r'^(doi:|DOI:)\s*', '', doi, flags=re.IGNORECASE)
                
                # Nettoyer les caractères de fin indésirables
                doi = doi.rstrip('.,;)]')
                
                print(f"DOI trouvé: {doi}", file=sys.stderr)
                return doi

        print("Aucun DOI trouvé dans le PDF.", file=sys.stderr)
        return None
        
    except Exception as e:
        print(f"Erreur lors de l'extraction du DOI: {str(e)}", file=sys.stderr)
        return None

def main():
    """Fonction principale"""
    if len(sys.argv) != 2:
        print("Usage: python extract_doi.py <chemin_vers_pdf>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    doi = extract_doi_from_pdf(pdf_path)
    
    if doi:
        # Imprimer le DOI sur stdout (pour que Node.js puisse le récupérer)
        print(doi)
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()