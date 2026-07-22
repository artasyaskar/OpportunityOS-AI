import Link from 'next/link';

export default function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          listStyle: 'none',
          padding: 0,
          margin: 0,
          fontSize: 14,
          color: '#94a3b8',
        }}
      >
        {items.map((item, i) => (
          <li key={item.path} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {i < items.length - 1 ? (
              <>
                <Link href={item.path} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                  {item.name}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            ) : (
              <span aria-current="page" style={{ color: '#e2e8f0' }}>
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
