import axios, { AxiosResponse } from 'axios';
import queryString from 'query-string';

type Location = {
  x: number;
  y: number;
};

class GeoUtil {
  static readonly urlPrefix = 'https://dapi.kakao.com/v2';

  private static getKey(): string {
    return process.env.GATSBY_KAKAO_REST_API || '';
  }

  public static geolocation(address: string): Promise<void | AxiosResponse<any, any>> {
    const key = this.getKey();
    const params = {
      analyze_type: 'similar',
      query: address,
      page: 1,
      size: 10,
    };

    const url = `${this.urlPrefix}/local/search/address.json?${queryString.stringify(params)}`;
    return axios
      .get(url, {
        headers: {
          Authorization: `KakaoAK ${key}`,
        },
      })
      .then((res) => {
        if (res) {
          const { data } = res;
          return (data && data.documents && data.documents[0] && data.documents[0].address) || null;
        }

        return null;
      })
      .catch((error) => console.error(error));
  }

  public static getCenter(locations: Location[]): Location {
    let x = 0;
    let y = 0;
    let z = 0;

    locations.forEach((location) => {
      const latitude = (location.y * Math.PI) / 180;
      const longitude = (location.x * Math.PI) / 180;

      x += Math.cos(latitude) * Math.cos(longitude);
      y += Math.cos(latitude) * Math.sin(longitude);
      z += Math.sin(latitude);
    });

    const { length } = locations;

    x = x / length;
    y = y / length;
    z = z / length;

    var centralLongitude = Math.atan2(y, x);
    var centralSquareRoot = Math.sqrt(x * x + y * y);
    var centralLatitude = Math.atan2(z, centralSquareRoot);

    return { x: (centralLongitude * 180) / Math.PI, y: (centralLatitude * 180) / Math.PI };
  }
}

export default GeoUtil;
