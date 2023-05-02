import { Manager as LavacordManager, LavalinkNodeOptions, ManagerOptions } from "lavacord";
import { Client as DiscordClient, GatewayDispatchEvents } from "discord.js";

export * from "lavacord";

export class Manager extends LavacordManager {
    public constructor(readonly client: DiscordClient, nodes: LavalinkNodeOptions[], options?: ManagerOptions) {
        super(nodes, options && !options.user && client.user?.id ? Object.assign(options, { user: client.user.id }) : { user: client.user?.id });

        this.send = packet => {
            if (this.client.guilds.cache) {
                const guild = this.client.guilds.cache.get(packet.d.guild_id);
                if (guild) return guild.shard.send(packet);
            }
        };

        client.once("ready", () => {
            this.user = client.user!.id;
            this.shards = client.options.shardCount || 1;
        });

        client.ws
            .on(GatewayDispatchEvents.VoiceServerUpdate, this.voiceServerUpdate.bind(this))
            .on(GatewayDispatchEvents.VoiceStateUpdate, this.voiceStateUpdate.bind(this))
            .on(GatewayDispatchEvents.GuildCreate, async data => {
                for (const state of data.voice_states) await this.voiceStateUpdate({ ...state, guild_id: data.id });
            });
    }
}
