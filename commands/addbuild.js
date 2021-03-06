const fs = require('fs');
const {MessageEmbed} = require('discord.js');
const globalFunctions = require('./globalfunctions.js');

/*
 * Command that takes a new build entered by a user with permission, breaks it down into god, role, and item list, 
 * and enters it into the builds list in the builds.json file.
 */
module.exports = {
	name: 'addbuild',
    aliases: ["ab"],
	description: 'Add a new mentor set builds for chosen god',
	async execute(message, args, client) {
        let hasPerms = await globalFunctions.userHasPerms(message);
        if (!hasPerms) {
            const embed = new MessageEmbed().setDescription("You do not have permission to do this here!");
            message.channel.send({embeds: [embed]}); 
            return;
        }
        if (args == "") { 
            const embed = new MessageEmbed().setDescription("Please Enter a God");
            message.channel.send({embeds: [embed]}); 
            return;
        }
        findGod(message, args, client);
	},
};

/**
 * Uses the gods list in gods.json to check if the entered god name for the new build matches an existing god in the game.
 * @param {object} message - The discord message with the original command, passed here for use later.
 * @param {array} args - The list of arguments for the current command, this contains the new build's god, role, and items.
 * @param {object} client = The discord API client the bot is using, passed here for use later.
 */
async function findGod(message, args, client){
    const godName = [args.splice(0, 1).join(' ').replace(/ /g, "").replace("'", "").trim().toLowerCase()];
    const role = args.splice(0, 1).join(' ').replace(/ /g, "").replace("'", "").trim().toLowerCase();
    const godObject = await globalFunctions.findObjectWithShortenedName(godName, "god");
    const god = godObject.object;
    const exactMatch = godObject.exact;
    if (god) {
        const items = args.join(" ");
        addBuild(message, items, god.Name, role, client, exactMatch);
    } else {
        const embed = new MessageEmbed().setDescription("God Not Found, Check Your Spelling");
        message.channel.send({embeds: [embed]});
    }
}

//TODO: split this into 2-3 functions and then come back and do jsdoc.
function addBuild(message, items, godName, role, client, exactMatch) {
    if (role == "") {
        const embed = new MessageEmbed().setDescription("Enter a role!\nValid roles: Jungle, Solo, Mid, ADC, Support, General, Guide\nExample full command: ?ab thor jungle build, here, (can use) any, [punctuation] or, (format)");
        message.channel.send({embeds: [embed]}); 
        return;
    }
    if (role.toLowerCase() == "adc") {
        role = role.toUpperCase();
    } else {
        role = role.charAt(0).toUpperCase() + role.slice(1);
    }
    if (!(["Jungle", "Solo", "Mid", "ADC", "Support", "General", "Guide"].includes(role))) {
        const embed = new MessageEmbed().setDescription("Invalid role entered \nValid roles: Jungle, Solo, Mid, ADC, Support, General, Guide\nExample full command: ?ab thor jungle build, here, (can use) any, [punctuation] or, (format)");
        message.channel.send({embeds: [embed]}); 
        return;
    } 
    if (items.length == 0) {
        const embed = new MessageEmbed().setDescription("Forget to enter a build?\nExample full command: ?ab thor jungle build, here, (can use) any, [punctuation] or, (format)");
        message.channel.send({embeds: [embed]}); 
        return;
    }
    //probably not an efficient way of doing ids but there shouldnt ever be more than like 4-500 builds in this bot
    let usedIds = new Array();
    let duplicate = false;
    fs.readFile('builds.json', 'utf8', (err, buildsData) => {
        if (err) {
            console.log("File read failed: ", err);
            return;
        }
        try {
            buildList = JSON.parse(buildsData);
        } catch (err) {
            console.log("error parsing json string: ", err);
            return;
        }
        buildList.forEach(build => {
            if (build.god == godName && build.role == role && build.items == items) {
                duplicate = true;
                const embed = new MessageEmbed().setDescription(`Build already exactly matches current build with id ${build.id}`);
                message.channel.send({embeds: [embed]});
                return;
            } else {
                usedIds.push(build.id);
            }
        });
        if (duplicate) return;
        let id = 1;
        while (true) { //i know i know
            if (!(usedIds.includes(id))) {
                break;
            }
            id++;
        }
        buildList.push({
            "id" : id,
            "god" : godName,
            "role" : role,
            "items" : items,
            "author" : message.author.username
        });
        const data = JSON.stringify(buildList, null, 4);
        fs.writeFile('builds.json', data, (err) => {
            if (err) {
                throw err;
            } else {
                console.log("Builds saved to file");
                if (exactMatch) {
                    const embed = new MessageEmbed().setDescription(`Added new build for ${godName} in role ${role} (id ${id})\nBuild: ${items}`);
                    message.channel.send({embeds: [embed]});
                } else {
                    const embed = new MessageEmbed().setDescription(`Added new build for ${godName} (partial match for god entered) in role ${role} (id ${id})\nBuild: ${items}`);
                    message.channel.send({embeds: [embed]});
                }
                const ch = client.channels.cache.find(c => c.id == 895777081630265395);
                ch.send({files: ["./builds.json"]});
            }
        })
    });
}