import { command } from '../decorators';
import { loadModules, unloadModules, modules, listeners, commands } from '../Modules';
import { blue, green } from 'chalk';

export default class Licorne {
	@command(/^reload$/)
	reload({ channel }) {
		unloadModules();
		const modules = [];
		loadModules(name => {
			modules.push(name);
			console.log(blue(`Reloading module ${green.bold(name)}!`));
		}, true);

		return channel.send(
			`\`\`\`Apache\n${modules
				.map(name => 'Reloading ' + name)
				.join('\n')}\`\`\``
		);
	}

	@command(/^echo (.+)$/)
	echo(message, msg) {
		return message.reply(`\`\`\`${msg}\`\`\``);
	}

	@command(/^modules$/)
	modules({ channel }) {
		return channel.send(
			'Module list:\n' +
			`\`\`\`Apache\n${modules
				.map(({ name }) => name)
				.join('\n')}\`\`\``
		);
	}

	@command(/^module (\w+)$/)
	module({ channel }, module) {
		const mod = modules.find(mod => mod.name == module);
		if (!mod)
			return channel.send('Cannot find module ' + module + '.')

		const list = Array.from(listeners.entries())
			.reduce((acc, [event, ls]) => 
				acc.concat(ls.filter(({ target }) => target.constructor.name === module)
					.map(({ name }) => `${event} ${name}`)),
				[]
			)
			.join('\n');
		const comm = Array.from(commands.entries())
			.filter(([regex, { target }]) => target.constructor.name === module)
			.map(([regex, { name }]) => `${regex} ${name}`)
			.join('\n');
		const prop = Object.entries(mod)
			.map(([k, v]) => `${module}.${k} ${this.stringify(v)}`)
			.join('\n');

		return channel.send(
			`__Module **${module}**:__`
		).then(({ channel }) => channel.send(
			'> *Listeners*\n' +
			`\`\`\`Apache\n${list || 'None'}\`\`\``
		)).then(({ channel }) => channel.send(
			'> *Commands*\n' +
			`\`\`\`Apache\n${comm || 'None'}\`\`\``
		)).then(({ channel }) => channel.send(
			'> *Properties*\n' +
			`\`\`\`Apache\n${prop || 'None'}\`\`\``
		));

	}

	stringify(obj) {
		let str = JSON.stringify(obj);
		if (str.length > 256) str = str.substring(0, 255);
		return str;
	}
}
