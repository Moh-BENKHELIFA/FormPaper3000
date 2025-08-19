#!/usr/bin/env python3
"""
Script pour extraire les images d'un fichier PDF
Usage: python extract_images.py <chemin_vers_pdf> <dossier_sortie>
"""

import os
import sys
import fitz  # PyMuPDF
import json

def extract_images_from_pdf(pdf_path, output_folder):
    """
    Extrait toutes les images d'un fichier PDF
    
    Args:
        pdf_path (str): Chemin vers le fichier PDF
        output_folder (str): Dossier où sauvegarder les images
        
    Returns:
        list: Liste des chemins des images extraites
    """
    try:
        # Créer le dossier de sortie s'il n'existe pas
        if not os.path.exists(output_folder):
            os.makedirs(output_folder)

        # Vérifier que le fichier existe
        if not os.path.exists(pdf_path):
            print(f"Erreur: Le fichier {pdf_path} n'existe pas", file=sys.stderr)
            return []

        # Ouvrir le fichier PDF
        doc = fitz.open(pdf_path)
        extracted_images = []

        # Parcourir chaque page du PDF
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            image_list = page.get_images(full=True)

            # Extraire chaque image de la page
            for img_index, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]

                    # Générer un nom de fichier unique
                    filename = f"page_{page_num + 1}_img_{img_index + 1}.{image_ext}"
                    output_path = os.path.join(output_folder, filename)

                    # Sauvegarder l'image
                    with open(output_path, "wb") as image_file:
                        image_file.write(image_bytes)

                    # Vérifier que l'image n'est pas trop petite (éviter les icônes, etc.)
                    if len(image_bytes) > 1024:  # Plus de 1KB
                        extracted_images.append({
                            'path': output_path,
                            'filename': filename,
                            'page': page_num + 1,
                            'size': len(image_bytes),
                            'format': image_ext
                        })

                        print(f"Image extraite: {filename} (Page {page_num + 1}, {len(image_bytes)} bytes)", file=sys.stderr)

                except Exception as img_error:
                    print(f"Erreur lors de l'extraction de l'image {img_index} de la page {page_num}: {img_error}", file=sys.stderr)
                    continue

        # Fermer le document
        doc.close()

        print(f"Extraction terminée: {len(extracted_images)} images extraites", file=sys.stderr)
        return extracted_images

    except Exception as e:
        print(f"Erreur lors de l'extraction des images: {str(e)}", file=sys.stderr)
        return []

def main():
    """Fonction principale"""
    if len(sys.argv) != 3:
        print("Usage: python extract_images.py <chemin_vers_pdf> <dossier_sortie>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_folder = sys.argv[2]

    extracted_images = extract_images_from_pdf(pdf_path, output_folder)

    if extracted_images:
        # Retourner la liste des images au format JSON sur stdout
        print(json.dumps(extracted_images))
        sys.exit(0)
    else:
        print("Aucune image extraite", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()