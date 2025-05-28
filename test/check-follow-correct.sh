#!/bin/bash

# Charger les variables d'environnement depuis .env
source <(grep -v '^#' .env | sed 's/^/export /')

# Paramètres pour le test
TARGET_FID=${1:-"976189"}  # FID par défaut si non spécifié

echo "=== TEST DE VÉRIFICATION DE FOLLOW AVEC CURL ==="
echo "Bot FID: $BOT_FID"
echo "Target FID: $TARGET_FID"
echo "API Key: ${NEYNAR_API_KEY:0:8}..."
echo "--------------------------------------------------"

# Vérifier les utilisateurs suivis par le bot
echo "1. Vérification des utilisateurs que le bot suit (following)..."
FOLLOWING=$(curl -s -X GET \
  "https://api.neynar.com/v2/farcaster/user/following?fid=$BOT_FID&limit=100" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $NEYNAR_API_KEY")

echo "Utilisateurs suivis par le Bot FID $BOT_FID:"
echo "$FOLLOWING" | jq . || echo "$FOLLOWING"
echo "--------------------------------------------------"

# Extraire les FIDs des utilisateurs suivis et vérifier si TARGET_FID est dans la liste
echo "Analyse des résultats..."
if echo "$FOLLOWING" | jq -e ".users" > /dev/null; then
  # Extraire tous les FIDs
  FOLLOWING_FIDS=$(echo "$FOLLOWING" | jq '.users[].fid')
  
  # Vérifier si TARGET_FID est dans la liste
  if echo "$FOLLOWING_FIDS" | grep -q "$TARGET_FID"; then
    echo "✅ CONFIRMATION: Le bot suit bien l'utilisateur avec FID $TARGET_FID"
  else
    echo "❌ Le bot NE SUIT PAS l'utilisateur avec FID $TARGET_FID"
    
    # Lister les FIDs suivis pour référence
    echo "FIDs suivis: $FOLLOWING_FIDS"
  fi
else
  echo "Erreur ou format de réponse inattendu."
fi
