import { Rnd } from 'react-rnd';

export default function ImageLayer({ images, onUpdate, isPreview, selectedImageId, onSelect }) {
  if (isPreview) return null;

  return (
    <div 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', // Allow clicks through to editor text
        zIndex: 5
      }}
    >
      {images.map((img) => (
        <Rnd
          key={img.id}
          default={{
            x: img.x || 100,
            y: img.y || 100,
            width: img.width || 200,
            height: img.height || 'auto',
          }}
          position={{ x: img.x, y: img.y }}
          size={{ width: img.width, height: img.height }}
          onDragStop={(e, d) => {
            onUpdate(img.id, { x: d.x, y: d.y });
          }}
          onResizeStop={(e, direction, ref, delta, position) => {
            onUpdate(img.id, {
              width: ref.style.width,
              height: ref.style.height,
              ...position,
            });
          }}
          onDragStart={() => onSelect(img.id)}
          onResizeStart={() => onSelect(img.id)}
          onClick={(e) => {
             e.stopPropagation();
             onSelect(img.id);
          }}
          bounds="parent"
          style={{ 
            pointerEvents: 'auto', // Re-enable pointer events for image
          }}
          className={`${img.id === selectedImageId ? 'border-2 border-dashed border-gray-300' : 'border-2 border-transparent hover:border-blue-300'} transition-colors`}
        >
          <div style={{ width: '100%', height: '100%', position: 'relative', group: 'group' }}>
            <img 
              src={img.url} 
              alt="User Upload" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                pointerEvents: 'none' // Prevent native drag ghost
              }} 
            />
            {/* Simple Delete Button on Hover (can be improved) */}
            <button
              onClick={(e) => {
                 e.stopPropagation();
                 onUpdate(img.id, null); // Null means delete
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity"
              style={{ pointerEvents: 'auto' }}
            >
              ×
            </button>
          </div>
        </Rnd>
      ))}
    </div>
  );
}
