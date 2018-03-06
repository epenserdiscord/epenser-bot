import { RichEmbed } from 'discord.js';
import { on } from '../decorators';
import gSettings from '../../settings.json';
import settings from './Suggestions.json';
import { client } from '../discord';
import { embeds } from '../utils';

const MSG_REGEX = /^(.+) (https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*))(?: (.+))?$/;

export default class Suggestions {
	@on('ready')
	onReady() {
		return Promise.all(
			gSettings.guilds
				.map(sGuild => [
					client.guilds.find(({ id }) => id == sGuild.id),
					sGuild.channels.suggestions
				])
				.map(([guild, sChannel]) =>
					guild.channels.find(({ id }) => id == sChannel)
				)
				.map(channel => channel.fetchMessages()) //Allow the bot to listen to reactions in previous messages.
		);
	}

	@on('message')
	onMessage(message) {
		const promises = [];

		if (message.author === client.user) return;

		if (!this.isSuggestionsChannel(message)) return;

		promises.push(message.delete());

		const reg = MSG_REGEX.exec(message.content);

		if (!reg || !settings.themes.includes(reg[1])) {
			const embed = embeds
				.err(
					'Erreur: le format pour envoyer une suggestion de gif/image est le suivant:'
				)
				.setDescription(
					"`{thème} {url} [optionnel: description]`\n*Veillez à fournir l'anime d'origine / auteur de l'image en" +
						' description.*'
				)
				.addField('Thèmes', settings.themes_message, true)
				.addField('Votre message', `\`${message.content}\``, true)
				.setFooter('Que le moe soit avec vous, jeune padawan.');

			promises.push(message.author.send({ embed }));
			return Promise.all(promises);
		}

		const [, theme, url, desc] = reg;

		const embed = new RichEmbed()
			.setAuthor(
				`${message.author.username} <${message.author.id}>`,
				message.author.avatarURL
			)
			.addField('Thème', theme, true)
			.addField('URL', url, true)
			.setDescription(desc)
			.setImage(url)
			.setColor(0xe0a826)
			.setTimestamp();

		promises.push(message.channel
			.send({ embed })
			.then(message => message.react('👍')) //Ensure order
			.then(({ message }) => message.react('👎'))
			.then(({ message }) => message.react('❌')));

		return Promise.all(promises);
	}

	@on('messageReactionAdd')
	onReaction(reaction, user) {
		if (!this.isSuggestionsChannel(reaction.message)) return;

		const embed = reaction.message.embeds[0];
		if (!embed) return;

		const id = /<(\d+)>/.exec(embed.author.name)[1]; //Get id in name

		if (reaction.emoji.name === '❌' && id === user.id)
			return reaction.message.delete();
	}

	isSuggestionsChannel({ channel, guild }) {
		const sGuild = guild && gSettings.guilds.find(({ id }) => guild.id == id);
		return sGuild && channel.id == sGuild.channels.suggestions;
	}
}
