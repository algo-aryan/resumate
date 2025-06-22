import fetch from 'node-fetch';

export async function fetchGitHubProfile(username) {
  const userRes = await fetch(`https://api.github.com/users/${username}`);
  const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);

  if (!userRes.ok || !reposRes.ok) throw new Error("GitHub API error");

  const userData = await userRes.json();
  const reposData = await reposRes.json();

  const topRepos = reposData
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map(repo => ({
      title: repo.name,
      description: repo.description || "No description"
    }));

  return {
    name: userData.name || username,
    bio: userData.bio || '',
    email: userData.email || '',
    location: userData.location || '',
    projects: topRepos,
    skills: [...new Set(reposData.flatMap(r => r.language ? [r.language] : []))].filter(Boolean)
  };
}