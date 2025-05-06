/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Если вы не используете строгую типизацию для имен классов и просто хотите,
// чтобы TypeScript не ругался, можно использовать более простой вариант:
// declare module '*.module.scss';

// Если вы импортируете и другие ассеты, например, картинки
// declare module '*.svg' {
//   import React = require('react');
//   export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
//   const src: string;
//   export default src;
// }
// declare module '*.png';
// declare module '*.jpg';
// declare module '*.jpeg';
// declare module '*.gif';
