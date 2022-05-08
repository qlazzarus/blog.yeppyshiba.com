import React, { FunctionComponent } from 'react';
import { Box, Divider } from '@chakra-ui/react';

interface FootnoteWrapperProps {
    children: React.ReactElement[];
}

const FootnoteEntry: FunctionComponent = (props) => {
    /*
    children: Array(2)
        0: "Footnote text goes here."
        1:
            $$typeof: Symbol(react.element)
            key: null
            props: {parentName: 'li', href: '#fnref-1', className: 'footnote-backref', originalType: 'a', mdxType: 'a', …}
            ref: null
            type: {$$typeof: Symbol(react.forward_ref), render: ƒ}
            _owner: FiberNode {tag: 0, key: null, stateNode: null, elementType: ƒ, type: ƒ, …}
            _store: {validated: true}
            _self: null
            _source: null
            [[Prototype]]: Object
        length: 2
    [[Prototype]]: Array(0)
    id: "fn-1"
    mdxType: "li"
    originalType: "li"
    parentName: "ol"    
    */
    console.log(props);
    /*
    <Modal isCentered isOpen={isOpen} onClose={onClose}>
        {overlay}
        <ModalContent>
          <ModalHeader>Modal Title</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Custom backdrop filters!</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    */
    return (
        <>
        </>
    );
}

const FootnoteWrapper: FunctionComponent<FootnoteWrapperProps> = ({ children }) => {
    const list = children.filter((child) => child.props.originalType === 'ol');
    if (!list || !list.length) {
        return <></>;
    }

    const entries: React.ReactElement[] = list[0].props.children;
    return <>{entries.map((entry, index) => <FootnoteEntry key={index} {...entry.props} />)}</>;
};

export default FootnoteWrapper;