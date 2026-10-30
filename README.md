# 🪴 Petal Pal

A tiny plant dashboard. Your ESP32 posts temperature, humidity, soil moisture, light and a photo; Petal Pal shows how your plant is feeling.

## Deploy
1. Push this folder to a GitHub repo, then import it on vercel.com (no framework settings needed).
2. In the Vercel project: **Storage → Create → Blob**, choose **Public** access, and connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`).
3. Redeploy. Open your URL.

Optional: add an env var `PLANT_API_KEY` to require an `x-api-key` header on POST. Leave it unset for a fully open endpoint.

## API
`POST /api/readings`

Option A, raw JPEG + query params (best for ESP32):
```
POST /api/readings?temperature=23.4&humidity=55&soil_moisture=41&light=320
Content-Type: application/octet-stream
<jpeg bytes>
```
Option B, JSON (image optional, base64):
```
{"temperature":23.4,"humidity":55,"soil_moisture":41,"light":320,"image":"<base64>"}
```
`GET /api/readings?limit=48` returns recent readings, newest first.

Test it:
```
curl -X POST "https://YOUR-APP.vercel.app/api/readings?temperature=22&humidity=50&soil_moisture=40&light=300" \
  -H "Content-Type: application/octet-stream" --data-binary @plant.jpg
```
