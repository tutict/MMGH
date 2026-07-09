import React from "react";
import { Slider } from "@mui/material";

type AppSliderProps = React.ComponentProps<typeof Slider>;

function AppSlider(props: AppSliderProps) {
  return <Slider {...props} />;
}

export default AppSlider;
