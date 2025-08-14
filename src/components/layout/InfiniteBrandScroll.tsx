import React from 'react';
import { SiNike, SiAdidas, SiPuma, SiUnderarmour, SiNewbalance, SiReebok, SiFila } from 'react-icons/si';

const brands = [
  { name: 'Nike', icon: SiNike },
  { name: 'Adidas', icon: SiAdidas },
  { name: 'Puma', icon: SiPuma },
  { name: 'Under Armour', icon: SiUnderarmour },
  { name: 'New Balance', icon: SiNewbalance },
  { name: 'Reebok', icon: SiReebok },
  { name: 'Fila', icon: SiFila },
];

const InfiniteBrandScroll = () => {
  return (
    <div
      className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]"
    >
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-infinite-scroll">
        {brands.map((brand, index) => (
          <li key={index} title={brand.name}>
            <brand.icon className="h-8 w-auto text-muted-foreground" />
          </li>
        ))}
      </ul>
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-infinite-scroll" aria-hidden="true">
        {brands.map((brand, index) => (
          <li key={index} title={brand.name}>
            <brand.icon className="h-8 w-auto text-muted-foreground" />
          </li>
        ))}
      </ul>
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-infinite-scroll" aria-hidden="true">
        {brands.map((brand, index) => (
          <li key={index} title={brand.name}>
            <brand.icon className="h-8 w-auto text-muted-foreground" />
          </li>
        ))}
      </ul>
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-infinite-scroll" aria-hidden="true">
        {brands.map((brand, index) => (
          <li key={index} title={brand.name}>
            <brand.icon className="h-8 w-auto text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InfiniteBrandScroll;
