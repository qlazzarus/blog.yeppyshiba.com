import React, { FunctionComponent } from 'react';
import { GroupCountType } from '@/types';

interface CategoryCloudProps {
  categories: GroupCountType[];
}

const CategoryCloud: FunctionComponent<CategoryCloudProps> = ({ categories }) => {
  console.log(categories);
  return <></>;
};

export default CategoryCloud;
