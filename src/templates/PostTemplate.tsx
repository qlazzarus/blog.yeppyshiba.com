import React, { FunctionComponent } from 'react';
import { graphql } from 'gatsby';

type PostTemplateProps = {
  data: {
    allMarkdownRemark: {
      edges: any[]//PostPageItemType[]
    }
  }
  location: {
    href: string
  }
}

/*
export default function BlogPostTemplate({ data, location }) {
    const { markdownRemark: { frontmatter, html } } = data;
    
  }
*/ 
const PostTemplate: FunctionComponent<PostTemplateProps> = function({
  data: {
    allMarkdownRemark: { edges },
  },
  //location: { href }
}) {
  const {
    node: {
      html,
      frontmatter: {
        title,
        summary,
        date,
        categories,
        /*
        thumbnail: {
          childImageSharp: { gatsbyImageData },
          publicURL
        },
        */
      },
    },
  } = edges[0];

  return (
    <div>
        <h1>{title}</h1>
        <h2>{date}</h2>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
        />
    </div>
  );
}

export default PostTemplate; 

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            date(formatString: "YYYY년 MM월 DD일")
          }
        }
      }
    }
  }
`
/*
export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            summary
            date(formatString: "YYYY년 MM월 DD일")
            categories
            thumbnail {
              childImageSharp {
                gatsbyImageData
              }
              publicURL
            }
          }
        }
      }
    }
  }
`
*/