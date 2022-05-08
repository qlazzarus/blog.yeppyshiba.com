import React, { createContext, FunctionComponent, useContext } from 'react';
import { useDisclosure, UseDisclosureReturn } from '@chakra-ui/react';

export const ModalContext = createContext({});

export const ModalProvider: FunctionComponent = ({ children }) => {
  const value = {};

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

/*

*/
/*
// Provider component that wraps your app and makes modal object ...
// ... available to any child component that calls useModal().
export function ModalProvider({ children }) {
  const modal = useModalDisclosure();
  return <ModalContext.Provider value={modal}>{children}</ModalContext.Provider>;
}

ModalProvider.propTypes = {
  children: PropTypes.element.isRequired,
};

// Hook for child components to get the modal object ...
// ... and re-render when it changes.
export const useModal = () => {
  return useContext(ModalContext);
};
*/
