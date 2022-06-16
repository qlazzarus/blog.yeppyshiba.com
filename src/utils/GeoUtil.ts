import axios, { AxiosResponse } from 'axios';
import queryString from 'query-string';

type Location = {
  x: number,
  y: number
}

class GeoUtil {
  static readonly urlPrefix = 'https://api.vworld.kr';

  private static getKey(): string {
    return process.env.GATSBY_VWORLD_API || '';
  }

  public static geolocation(address: string, type: 'road' | 'parcel'): Promise<void | AxiosResponse<any, any>> {
    const key = this.getKey();
    const params = {
      service: 'address',
      request: 'getcoord',
      version: '2.0',
      crs: 'epsg:4326',
      address,
      refine: 'true',
      simple: 'true',
      type,
      key,
    };

    const url = `${this.urlPrefix}/req/address?${queryString.stringify(params)}`;

    return axios
      .get(url)
      .then((res) => {
        if (res) {
          const { data } = res;
          return (data && data.response && data.response.result) || null;
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
