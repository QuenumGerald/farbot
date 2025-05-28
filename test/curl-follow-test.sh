#!/bin/bash

# Charger les variables d'environnement depuis .env
source <(grep -v '^#' .env | sed 's/^/export /')

# Paramètres pour le test
TARGET_FID=${1:-"976189"}  # FID par défaut si non spécifié

# Informations sur les paramètres
echo "=== TEST DE FOLLOW AVEC CURL ==="
echo "Signer UUID: $NEYNAR_SIGNER_UUID"
echo "Bot FID: $BOT_FID"
echo "Target FID: $TARGET_FID"
echo "API Key: ${NEYNAR_API_KEY:0:8}..."
echo "--------------------------------------------------"

# Préparer le JSON pour la requête
JSON_DATA=$(cat <<EOF
{
  "signer_uuid": "$NEYNAR_SIGNER_UUID",
  "target_fids": [$TARGET_FID]
}
EOF
)

# Afficher la requête
echo "Requête JSON:"
echo "$JSON_DATA"
echo "--------------------------------------------------"

# Exécuter la requête curl
echo "Envoi de la requête curl..."
RESPONSE=$(curl -s -X POST \
  "https://api.neynar.com/v2/farcaster/user/follow" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $NEYNAR_API_KEY" \
  -d "$JSON_DATA")

# Afficher la réponse
echo "Réponse de l'API:"
echo "$RESPONSE" | jq . || echo "$RESPONSE"
echo "--------------------------------------------------"

# Vérifier la relation (si le follow a réussi)
echo "Vérification de la relation..."
RELATIONSHIP=$(curl -s -X GET \
  "https://api.neynar.com/v2/farcaster/user/relationship?fid=$BOT_FID&target_fid=$TARGET_FID" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $NEYNAR_API_KEY")

echo "Relation entre Bot FID $BOT_FID et Target FID $TARGET_FID:"
echo "$RELATIONSHIP" | jq . || echo "$RELATIONSHIP"
