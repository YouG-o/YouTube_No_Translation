/*
 * Copyright (C) 2025-present Sebastián Dinator (https://github.com/Seva41) - Safari port
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o) - Original project
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * This program is distributed without any warranty; see the license for details.
 */

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Override point for customization after application launch.
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

}
