'use client';
import { useState } from 'react';
import type { Product } from './types';

function ProductImage({ id, name, large }: { id: string; name: string; large: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        className={'product-art product-art--failed ' + (large ? 'large' : '')}
        role="img"
        aria-label={name + '图片加载失败'}
      >
        <span>图片暂时走丢了</span>
      </div>
    );
  return (
    <div className={'product-art product-art--image ' + (large ? 'large' : '')}>
      {!loaded && <span className="product-art-loading" aria-hidden="true" />}
      <img
        className={loaded ? 'is-loaded' : ''}
        src={'/api/images/' + id}
        alt={name}
        loading={large ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function ProductArt({
  product,
  large = false,
  purpose = large ? 'detail' : 'card',
}: {
  product: Product;
  large?: boolean;
  purpose?: 'thumbnail' | 'card' | 'detail';
}) {
  const id =
    purpose === 'thumbnail'
      ? product.thumbnailId || product.originalId
      : product.selectedSource === 'ENHANCED' && product.enhancedId
        ? product.enhancedId
        : (purpose !== 'detail' && product.thumbnailId) || product.originalId;
  const image = id ? <ProductImage key={id} id={id} name={product.name} large={large} /> : null;
  if (image) return image;
  const palettes = [
    ['#edc8d5', '#f8e9ef', '#c884a0'],
    ['#a7c7c3', '#e2eeea', '#61968f'],
    ['#b8c9a7', '#edf1e4', '#819664'],
    ['#c7b5cf', '#efe6f3', '#987dab'],
  ];
  const paletteKey = `${product.series.character.name}:${product.series.name}`;
  const palette =
    palettes[
      [...paletteKey].reduce((sum, character) => sum + character.codePointAt(0)!, 0) %
        palettes.length
    ];
  return (
    <div
      className={'product-art placeholder ' + (large ? 'large' : '')}
      style={{ background: palette[1] }}
    >
      <svg viewBox="0 0 240 220" role="img" aria-label="商品图片占位">
        <defs>
          <linearGradient id={'g' + product.id} x2="1" y2="1">
            <stop stopColor="#fff" />
            <stop offset="1" stopColor={palette[0]} />
          </linearGradient>
        </defs>
        <circle cx="198" cy="32" r="50" fill="white" opacity=".3" />
        <path d="M20 170Q80 120 220 170" fill="none" stroke="white" opacity=".55" />
        {product.productType === 'BADGE' ? (
          <>
            <ellipse cx="125" cy="181" rx="62" ry="9" fill={palette[2]} opacity=".15" />
            <circle cx="120" cy="106" r="66" fill="white" stroke={palette[0]} strokeWidth="3" />
            <circle cx="120" cy="106" r="58" fill={'url(#g' + product.id + ')'} />
            <path d="M120 57L132 90L164 104L132 116L120 151L108 116L77 104L108 90Z" fill="white" />
            <circle cx="120" cy="105" r="16" fill={palette[2]} opacity=".6" />
          </>
        ) : (
          <>
            <rect
              x="63"
              y="32"
              width="116"
              height="148"
              rx={product.productType === 'POSTCARD' ? 2 : 42}
              fill={'url(#g' + product.id + ')'}
              stroke="white"
              strokeWidth="6"
              transform="rotate(-8 120 110)"
            />
            <path d="M121 60L133 94L165 108L133 120L121 151L109 120L77 108L109 94Z" fill="white" />
            <circle cx="121" cy="108" r="15" fill={palette[2]} opacity=".6" />
          </>
        )}
        <text x="120" y="207" textAnchor="middle" fontSize="9" letterSpacing="3" fill={palette[2]}>
          IMAGE PENDING
        </text>
      </svg>
      <span className="sample-label">待上传实拍</span>
    </div>
  );
}
