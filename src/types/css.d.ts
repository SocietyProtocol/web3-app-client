declare module "*.css" {
  const styles: { [className: string]: string };
  export default styles;
}

declare module "@rainbow-me/rainbowkit/styles.css";
