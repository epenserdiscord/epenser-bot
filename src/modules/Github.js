import { command } from '../decorators';
import { embeds, load } from '../utils';
import { RichEmbed } from 'discord.js';
import fetch from 'node-fetch';

const gSettings = load('global.json');
const settings = load('Github.json');

export default class Github {
	constructor() {
		this.category = {
			icon: '<:github:439408363080646666>',
			name: 'Github',
			desc: 'Commande en rapport avec Github'
		};
	}

	@command(/^github(?: ([^ ]+))?$/i, {
		name: 'github',
		desc: "Afficher les details d'une organisation sur github",
		usage: '[org]'
	})
	async overview({ channel }, org = settings.organization) {
		const { data: { organization } } = await this.graphql(
			`
        query ($org: String!){
            organization(login: $org) {
              name
              description
              location
              url
              email
              avatarUrl
              privateRepos: repositories(privacy: PRIVATE) {
                totalCount
              }
              publicRepos: repositories(privacy: PUBLIC) {
                totalCount
              }
              pinnedRepositories(first: 5) {
                nodes {
                  name
                  url
                }
              }
            }
          }`,
			{ org }
		);

		if (!organization)
			return channel.send({
				embed: embeds.err(`Cannot find organization "${org}"`)
			});

		const {
			name,
			description,
			location,
			url,
			email,
			avatarUrl,
			privateRepos: { totalCount: privateRepos },
			publicRepos: { totalCount: publicRepos },
			pinnedRepositories: { nodes: pinnedRepositories }
		} = organization;

		const embed = new RichEmbed()
			.setTitle(name)
			.setDescription(description)
			.setThumbnail(avatarUrl)
			.setURL(url);

		location && embed.addField('Location', location);
		email && embed.addField('Email', email);

		embed
			.addField('Public Repos', publicRepos, true)
			.addField('Private Repos', privateRepos, true);

		pinnedRepositories.length &&
			embed.addField(
				'Pinned',
				pinnedRepositories
					.map(({ name, url }) => `- [${name}](${url})`)
					.join('\n')
			);

		await channel.send({ embed });
	}

	@command(/^contributions(?: ([^ ]+))?$/i, {
		name: 'contributions',
		desc:
			"Afficher le leaderboard des contributions d'une organisation sur github pour cette semaine",
		usage: '[org]'
	})
	async contributions({ channel }, org = settings.organization) {
		const date = this.lastMonday(new Date());
		const since = date.toISOString();

		const {
			data: {
				organization: {
					login,
					avatarUrl,
					url,
					description,
					repositories: { nodes: repos }
				}
			}
		} = await this.graphql(
			`
        query ($org: String!, $since: GitTimestamp!){
					organization(login: $org) {
						login
						avatarUrl
						url
						description
						repositories(first: 100) {
							nodes {
								name
								ref(qualifiedName: "master") {
									target {
										... on Commit {
											id
											history(first: 100, since: $since) {
												nodes {
													author {
														name
													}
												}
											}
										}
									}
								}
							}
						}
					}
        }`,
			{ org, since }
		);

		const commits = repos
			.filter(repo => repo.ref)
			.map(repo => repo.ref.target.history.nodes)
			.reduce((acc, cur) => acc.concat(cur), []) //merge repos
			.map(commit => commit.author.name)
			.reduce((acc, cur) => (acc[cur] = (acc[cur] || 0) + 1) && acc, {}); //count

		const sorted = Object.entries(commits).sort(([, n1], [, n2]) => n2 - n1);

		const embed = new RichEmbed()
			.setTitle(
				`Contributions depuis le Lundi ${date.getDate()}/${date.getMonth() +
					1}/${date.getFullYear()} sur ${login}`
			)
			.setDescription(description)
			.setThumbnail(avatarUrl)
			.setURL(url)
			.setTimestamp()
			.setFooter('e-penser discord', gSettings.images.mainIcon);

		sorted.forEach(([author, commits], i) =>
			embed.addField(`#${i + 1} - ${author}`, commits, true)
		);

		await channel.send({ embed });
	}

	lastMonday(date) {
		date.setDate(date.getDate() - (date.getDay() + 13) % 7);
		date.setHours(0);
		date.setMinutes(0);
		date.setSeconds(0);
		return date;
	}

	graphql(query, variables) {
		return fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				authorization: `bearer ${process.env.GITHUB_TOKEN}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				query,
				variables
			})
		}).then(res => res.json());
	}
}
