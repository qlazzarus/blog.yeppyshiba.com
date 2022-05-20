import React, { FunctionComponent } from 'react';
import { Link as GatsbyLink } from 'gatsby';
import { kebabCase } from 'lodash';
import { GroupCountType } from '@/types';
import '@/components/tag-cloud.css';

interface TagCloudProps {
  tags: GroupCountType[];
}

const TagCloud: FunctionComponent<TagCloudProps> = ({ tags }) => {
  return (
    <ul className={'tag-cloud'}>
      {tags.map(({ fieldValue, totalCount }) => {
        return (
        <li>
            <GatsbyLink to={`/tag/${kebabCase(fieldValue)}`} data-weight={totalCount}>{fieldValue}</GatsbyLink>
        </li>
        );
      })}
    </ul>
  );
};

export default TagCloud;
