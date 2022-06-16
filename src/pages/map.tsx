import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { graphql, navigate } from 'gatsby';
import { Map, MapMarker, useMap } from 'react-kakao-maps-sdk';
import { Box } from '@chakra-ui/react';
import { Layout } from '@/components/common';
import { ArticleImage } from '@/components/article';
import { ArticleListItemsType } from '@/types';
import { GeoUtil } from '@/utils';

const DEFAULT_LNG = 126.795841;
const DEFAULT_LAT = 33.55635;

type MapPageProps = {
  data: {
    allMdx: {
      edges: ArticleListItemsType[];
    };
  };
};

type MarkerProps = {
  edge: ArticleListItemsType;
};

const Marker: FunctionComponent<MarkerProps> = ({ edge }) => {
  const map = useMap();
  const [isVisible, setIsVisible] = useState(false);
  const {
    node: {
      fields: { slug, geolocation },
    },
  } = edge;
  if (!geolocation) {
    return <></>;
  }

  const {
    point: { x: lng, y: lat },
  } = geolocation;

  const onOver = useCallback(() => setIsVisible(true), [setIsVisible]);
  const onOut = useCallback(() => setIsVisible(false), [setIsVisible]);
  const onClick = useCallback(() => navigate(`/article/${slug}`), [navigate, slug]);

  return (
    <MapMarker position={{ lng, lat }} onMouseOver={onOver} onMouseOut={onOut} onClick={onClick}>
      {isVisible && (
        <Box w={'full'} maxW={'10em'}>
          <ArticleImage entry={edge.node} />
        </Box>
      )}
    </MapMarker>
  );
};

const MapPage: FunctionComponent<MapPageProps> = ({
  data: {
    allMdx: { edges },
  },
}) => {
  const center = useMemo(() => {
    return GeoUtil.getCenter(
      edges.map((edge) => {
        const {
          node: {
            fields: { geolocation },
          },
        } = edge;
        if (!geolocation) {
          return { x: DEFAULT_LNG, y: DEFAULT_LAT };
        }

        const {
          point: { x, y },
        } = geolocation;

        return { x, y };
      }),
    );
  }, []);

  const bounds = useMemo(() => {
    if (typeof kakao == "undefined") return;
    
    const bounds = new kakao.maps.LatLngBounds();
    edges.forEach((edge) => {
      const {
        node: {
          fields: { geolocation },
        },
      } = edge;
      bounds.extend(new kakao.maps.LatLng(geolocation?.point.y || DEFAULT_LAT, geolocation?.point.x || DEFAULT_LNG));
    });

    return bounds;
  }, []);

  const mapRef: any = useCallback(
    (map: any) => {
      map && bounds && map.setBounds(bounds);
    },
    [bounds],
  );

  return (
    <Layout disableFooter={true}>
      <Map center={{ lat: center.y, lng: center.x }} style={{ width: '100%', height: '100vh' }} ref={mapRef}>
        {edges.map((edge, index) => (
          <Marker key={index} edge={edge} />
        ))}
      </Map>
    </Layout>
  );
};

export default MapPage;

export const getMap = graphql`
  query getMap {
    allMdx(filter: { fields: { geolocation: { id: { ne: null } } } }) {
      edges {
        node {
          id
          fields {
            totalCount
            slug
            geolocation {
              id
              crs
              point {
                x
                y
              }
            }
          }
          frontmatter {
            title
            date
            image
            embeddedImagesLocal {
              childImageSharp {
                gatsbyImageData
              }
            }
            category
            tags
            summary
          }
        }
      }
    }
  }
`;
