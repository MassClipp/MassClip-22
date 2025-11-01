"use client"

import type React from "react"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
} from "@chakra-ui/react"
import StripeIdentityVerification from "./stripe-identity-verification"

interface SSNModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  onSuccess: () => void
}

const SSNModal: React.FC<SSNModalProps> = ({ isOpen, onClose, accountId, onSuccess }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Verify Identity</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <StripeIdentityVerification accountId={accountId} onSuccess={onSuccess} onCancel={onClose} />
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SSNModal
