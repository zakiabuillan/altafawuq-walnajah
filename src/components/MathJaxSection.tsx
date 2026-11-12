import React, { useEffect, useRef } from 'react';

interface MathJaxSectionProps {
  children?: React.ReactNode;
  content?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  as?: 'div' | 'span' | 'p' | 'h3' | 'h4' | 'h5';
}

const isChemistryExpression = (text: string): boolean => {
  const hasChemicalElements = /[A-Z][a-z]?/.test(text);
  
  // Indicators of chemistry:
  // - elements with subscript/superscript charges: e.g. ^+, ^-, ^2+, ^2-, _2, _3
  // - states of matter: (aq), (s), (l), (g)
  // - common chemical formulas: H2O, CO2, H3O, OH, NaCl, NaOH, HCl, H2SO4, HNO3, NH3, NH4
  // - reaction symbols: ->, \rightarrow, \rightleftharpoons, + (as in reaction)
  const hasChemicalMarkers = /[\^+_\-\(\)]|->|\\rightarrow|\\rightleftharpoons|aq|aq|CO2|H2O|H3O|OH|NaCl|NaOH|HCl|H2SO4|HNO3|NH3|NH4/.test(text);
  
  // Math exclusives that are not used in normal basic chemistry equations:
  // (Note that "+" and "-" are used in chemistry for charges, but we exclude math if there's \frac, \sqrt, \sum, \int, variables like x, y, z with math symbols etc.)
  const hasMathExclusive = /\\frac|\\sqrt|\\sum|\\int|\\alpha|\\beta|\\gamma|\\theta|\\pi|\\infty|=|<|>|\\cdot|\\times/.test(text)
    && !text.includes('->') 
    && !text.includes('\\rightarrow') 
    && !text.includes('\\rightleftharpoons');

  return hasChemicalElements && hasChemicalMarkers && !hasMathExclusive;
};

export const tokenizeAndPreprocess = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Split using math delimiters $ or $$
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  
  const processedParts = parts.map((part) => {
    if (!part) return '';
    
    // If it is a math-wrapped block (starting and ending with $)
    if (part.startsWith('$')) {
      const isDouble = part.startsWith('$$') && part.endsWith('$$');
      const delimiter = isDouble ? '$$' : '$';
      const inner = part.slice(delimiter.length, -delimiter.length).trim();
      
      if (inner.startsWith('\\ce{') || inner.startsWith('ce{') || inner.startsWith('\\ce ')) {
        return part; // Already has \ce
      }
      
      if (isChemistryExpression(inner)) {
        return `${delimiter}\\ce{${inner}}${delimiter}`;
      }
      return part;
    }
    
    // It's a non-math plain text part. Find loose chemical formulas/ions and wrap them!
    let subPart = part;
    
    // Replace ions/formulas that have a charge or a subscript or aq marker.
    subPart = subPart.replace(/\b(H_?2O|CO_?2|H_?3O\^?\+|OH\^?[\-_]|H\^?[\-_]|Cl\^?[\-_]|Na\^?\+|NH_?4\^?\+|SO_?4\^?2\-)(?:\((aq|s|l|g)\))?\b/g, (match) => {
      return `$\\ce{${match}}$`;
    });
    
    // General chemicals with superscript charges and option physical states
    subPart = subPart.replace(/\b([A-Z][a-z]?\d*(?:_?\d+)?\^?[\d]*[\+\-])(?:\((aq|s|l|g)\))?\b/g, (match) => {
      return `$\\ce{${match}}$`;
    });
    
    return subPart;
  });
  
  return processedParts.join('');
};

export const MathJaxSection: React.FC<MathJaxSectionProps> = ({ 
  children, 
  content, 
  className, 
  style, 
  id,
  as: Component = 'div'
}) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (containerRef.current && window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
      // Direct typesetting of this container specifically for optimal performance
      window.MathJax.typesetPromise([containerRef.current]).catch((err) => {
        console.warn("MathJax subset typesetting warning:", err);
      });
    }
  }); // Run on every update to keep dynamic content (AI generations/edits) typeset perfectly

  let renderedContent = content !== undefined ? content : children;
  if (typeof renderedContent === 'string') {
    renderedContent = tokenizeAndPreprocess(renderedContent);
  }

  return (
    <Component id={id} ref={containerRef as any} className={className} style={style}>
      {renderedContent}
    </Component>
  );
};

export default MathJaxSection;
