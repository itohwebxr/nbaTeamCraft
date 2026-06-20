import Link from "next/link";

// Renders a team name, linking to its detail page when a matching public team
// id is known. Used by the result views on the sim detail page.
export default function TeamName({
  name,
  teamId,
  className = "",
}: {
  name: string;
  teamId?: string;
  className?: string;
}) {
  if (teamId) {
    return (
      <Link href={`/team/${teamId}`} className={`${className} hover:text-orange-300 hover:underline transition-colors`}>
        {name}
      </Link>
    );
  }
  return <span className={className}>{name}</span>;
}
