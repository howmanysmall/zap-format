opt server_output = "src/server/ZapServer.luau"
opt client_output = "src/client/ZapClient.luau"
opt types_output = "src/shared/Types/ZapTypes.luau"
opt call_default = "SingleAsync"
opt casing = "PascalCase"
opt write_checks = true
opt typescript = false
opt manual_event_loop = false
opt typescript_max_tuple_length = 15
opt typescript_enum = "ConstEnum"
opt yield_type = "promise"
opt async_lib = "require(game:GetService('ReplicatedStorage'):WaitForChild('Packages'):WaitForChild('Promise'))"
opt tooling = true
opt disable_fire_all = true
type GamePasses = enum {Vip}

event OnIdled = {
from: Client, type: Reliable, call: SingleAsync,
data: ( 
time: f32,),
}

event PromptNotification =
{
	from: Server, type: Reliable,
	data: ( type: string.utf8,
	message: string.utf8?,
	),
}


namespace BuddyMan = {
type Cool = enum {
	Hello,
	World,
}
 event CoolEvent = {
	from: Server, type: Reliable, call: SingleAsync,
	data: (coolType: Cool),
 }
}