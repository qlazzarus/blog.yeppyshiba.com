// scripts/updateLatLng.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import axios from 'axios';

const postsDir = path.join(process.cwd(), 'contents');
const KAKAO_API_KEY = process.env.GATSBY_KAKAO_REST_API as string; // Kakao API 키

async function getLatLngFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const headers = { Authorization: `KakaoAK ${KAKAO_API_KEY}` };
    const response = await axios.get(url, { headers });
    const data = response.data;
    if (data.documents && data.documents.length > 0) {
        const { x, y } = data.documents[0].address;
        return { lat: parseFloat(y), lng: parseFloat(x) };
    }
    return null;
}

(async () => {
    const files = fs.readdirSync(postsDir);

    for (const file of files) {
        const filePath = path.join(postsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: body } = matter(content);

        // lat/lng가 없지만 주소가 있는 경우에만 업데이트 진행
        const address = data.roadAddress || data.parcelAddress;
        if (address && (!data.lat || !data.lng)) {
            const latLng = await getLatLngFromAddress(address);
            if (latLng) {
                data.lat = latLng.lat;
                data.lng = latLng.lng;

                const newContent = matter.stringify(body, data);
                fs.writeFileSync(filePath, newContent, 'utf-8');
                console.log(`Updated lat/lng for ${file}`);
            } else {
                console.warn(`No lat/lng found for address: ${address} in file: ${file}`);
            }
        }
    }
    console.log('Lat/Lng update complete.');
})();
