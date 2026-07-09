import React from "react";
import { Modal } from "@mui/material";

type AppModalProps = React.ComponentProps<typeof Modal>;

function AppModal(props: AppModalProps) {
  return <Modal {...props} />;
}

export default AppModal;
