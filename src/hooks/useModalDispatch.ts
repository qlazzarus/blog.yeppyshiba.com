import React, { useContext } from 'react';
import { UseDisclosureReturn } from '@chakra-ui/react';
import { ModalDispatch, ModalDispatchContext } from '@/context';

const useModalDispatch = () => {
    const context = useContext(ModalDispatchContext);
    if (!context) {
        // TODO throw error
    }

    return context as ModalDispatch;
}

export default useModalDispatch;