import React, { FunctionComponent } from 'react';
import { navigate } from 'gatsby';
import type { PaginationContext } from "gatsby-awesome-pagination";
import { Container, Text, Stack } from "@chakra-ui/react";
import {
  Pagination as AjnaPagination,
  usePagination,
  PaginationPage,
  PaginationNext,
  PaginationPrevious,
  PaginationPageGroup,
  PaginationContainer,
  PaginationSeparator
} from "@ajna/pagination";

type PaginationProps = PaginationContext & {
  prefix: string;
  prev?: string;
  next?: string
}

const Pagination: FunctionComponent<PaginationProps> = ({ 
    numberOfPages,
    humanPageNumber,
    prefix,
    prev = `Prev`,
    next = `Next`,
 }) => {
  const handlePageChange = (page: number): void => {
    if (page === 1) {
      navigate(prefix);
    } else {
      navigate(`${prefix}${page}`);
    }
  }

  if (numberOfPages === 1) {
    return <></>;
  }

  const { 
    currentPage,
    pages,
    pagesCount
  } = usePagination({
    pagesCount: numberOfPages,
    initialState: { currentPage: humanPageNumber }
  });

  return (
    <Container maxW={'lg'} p="12">
      <Stack>
        <AjnaPagination
          pagesCount={pagesCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        >
          <PaginationContainer
            align={'center'}
            justify={'space-between'}
            p={4}
            w={'full'}
          >
            <PaginationPrevious>
              <Text>{prev}</Text>
            </PaginationPrevious>
            <PaginationPageGroup
              isInline
              align={'center'}
              separator={
                <PaginationSeparator
                  w={7}
                  jumpSize={11}
                />
              }
            >
              {pages.map((page: number) => (
                <PaginationPage
                  key={`pagination-page-${page}`}
                  page={page}
                  w={7}
                />
              ))}
            </PaginationPageGroup>
            <PaginationNext>
              <Text>{next}</Text>
            </PaginationNext>
          </PaginationContainer>
        </AjnaPagination>
      </Stack>
    </Container>
  );
};

export default Pagination;
