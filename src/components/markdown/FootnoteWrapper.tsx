import React, { FunctionComponent, useEffect } from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalFooter } from '@chakra-ui/react';
import { useModalDispatch, useModalState } from '@/hooks';

interface FootnoteWrapperProps {
  children: React.ReactElement[];
}

interface FootnoteEntryProps {
  id: string;
  children?: React.ReactElement[];
}

const FootnoteEntry: FunctionComponent<FootnoteEntryProps> = ({ id, children }) => {
  const dispatch = useModalDispatch();
  const state = useModalState(id);

  const isOpen = state && state == 'on' || false;
  const onClose = () => {
    dispatch({
      type: 'CLOSE',
      id
    });
  }

  useEffect(() => {
    dispatch({
      type: 'CREATE',
      id
    });
  }, []);

  return (
    <Modal isCentered isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const FootnoteWrapper: FunctionComponent<FootnoteWrapperProps> = ({ children }) => {
    const list = children.filter((child) => child.props.originalType === 'ol');
    if (!list || !list.length) {
        return <></>;
    }

    const entries: React.ReactElement | React.ReactElement[] = list[0].props.children;
    if (Array.isArray(entries)) {
      return <>{entries.map((entry, index) => <FootnoteEntry key={index} {...entry.props} />)}</>;
    }

    return <FootnoteEntry {...entries.props} />;
};

export default FootnoteWrapper;