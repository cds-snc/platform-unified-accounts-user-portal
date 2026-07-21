export const Step = ({ key, icon }: { key: string; icon: React.ReactNode }) => {
  return (
    <div>
      <div>{icon}</div>
      <div>Title</div>
      <div>Desc</div>
    </div>
  );
};
