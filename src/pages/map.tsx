import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import { Layout } from '@/components/common';
import { ArticleListItemsType } from '@/types';
import { GeoUtil } from '@/utils';

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
  const {
    node: {
      fields: { geolocation },
    },
  } = edge;
  if (!geolocation) {
    return <></>;
  }

  const {
    point: { x: lng, y: lat },
  } = geolocation;

  {
    /*
    <MapMarker position={{ lat: 33.55635, lng: 126.795841 }}>
      <div style={{ color: '#000' }}>Hello World!</div>
    </MapMarker>
  */
  }

  return <MapMarker position={{ lng, lat }}></MapMarker>;
};

const MapPage: FunctionComponent<MapPageProps> = ({
  data: {
    allMdx: { edges },
  },
}) => {
  const center = GeoUtil.getCenter(
    edges.map((edge) => {
      const {
        node: {
          fields: { geolocation },
        },
      } = edge;
      if (!geolocation) {
        return { x: 126.795841, y: 33.55635 };
      }

      const {
        point: { x, y },
      } = geolocation;

      return { x, y };
    }),
  );

  // TODO get max distance / auto adjust level
  const level = 8;

  return (
    <Layout disableFooter={true}>
      <Map center={{ lat: center.y, lng: center.x }} style={{ width: '100%', height: '100vh' }}
      level={level}>
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

/*
query MyQuery {

}
*/
