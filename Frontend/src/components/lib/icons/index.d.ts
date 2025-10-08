import * as React from 'react';

export interface IconProps {
  name: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  opacity?: number;
}

declare const Icon: React.FC<IconProps>;
export default Icon;
