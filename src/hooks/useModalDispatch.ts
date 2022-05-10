import React, { useContext } from 'react';
import { UseDisclosureReturn } from '@chakra-ui/react';
import { ModalDispatchContext } from '@/context';

const useModalDispatch = () => {
    return useContext(ModalDispatchContext);
}

export default useModalDispatch;