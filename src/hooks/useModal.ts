import React, { useContext } from 'react';
import { UseDisclosureReturn } from '@chakra-ui/react';
import { ModalContext } from '@/context';

const useModal = (id: string) => {
    const context = useContext(ModalContext);
    
    console.log(context);

    return context;
}

export default useModal;

/*
function useModalDisclosure() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isModalOpen = () => isOpen;
  const closeModal = () => onClose;
  const openModal = () => onOpen;
  
  return {
    openModal,
    closeModal,
    isModalOpen,
  };
}
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
