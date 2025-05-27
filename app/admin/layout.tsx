export const metadata = {
  title: 'JWS Admin - Área Administrativa',
  description: 'Área administrativa para gestão de relatórios de obras',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 