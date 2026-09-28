export type DriveCommand = {
    accelPressed: boolean;
    brakePressed: boolean;
    steerAxis: number;
};

export function mergeDriveCommands(commands: readonly DriveCommand[]): DriveCommand {
    const steerSum = commands.reduce((sum, command) => sum + command.steerAxis, 0);

    return {
        accelPressed: commands.some((command) => command.accelPressed),
        brakePressed: commands.some((command) => command.brakePressed),
        steerAxis: Math.max(-1, Math.min(1, steerSum)),
    };
}
