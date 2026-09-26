# flow.crm

flow.crm is a local Windows CRM for freelance designers. The interface is in English. This repository contains the source code and build instructions. Download the Windows installer or portable executable from [Releases](https://github.com/abdulloev-n/flow-crm/releases).

## Downloads

- `flow.crm-Setup-1.0.0-x64.exe`: Windows x64 installer with a setup wizard. At the end, you can launch the app and create a desktop shortcut.
- `flow.crm-Portable-1.0.0-x64.exe`: runs without installation. Keep the file in a folder where the app can write data.
- `flow-crm-source.zip`: source files without `node_modules`.

## Data storage

The installed app stores its SQLite database at `%LOCALAPPDATA%\flow.crm\flow.crm.sqlite`. You cannot change this location. Reinstalling the app does not delete the data folder.

The portable app creates a `flow.crm-data` folder beside its `.exe`. You can change the location in **Settings → Data & Storage → Change location**. The app restarts after the change. When you move the portable executable to another computer, copy its data folder too or import a backup.

In **Settings → Data & Storage**, you can open the data folder, export a backup, and import one. Before an import, the app saves a copy of the current database in the same folder.

## Build from source

1. Install a current Node.js LTS release from [nodejs.org](https://nodejs.org/).
2. Extract `flow-crm-source.zip` to a writable folder, or clone this repository.
3. Open PowerShell in that folder and run:

   ```powershell
   npm ci
   npm run check
   npm run dist
   ```

The installer and portable executable appear one directory above the source folder. Run `npm run dev` for development.

## App sections

- **Today** shows upcoming tasks, client replies, and payments.
- **All Tasks** brings tasks from every project into one filtered view.
- **Projects** contains the project board, task list, and project details.
- **Clients** stores contacts and linked projects.
- **Finances** tracks budgets and received or expected payments.
- **Archive** lets you restore completed projects.
- **Settings** controls appearance, interface density, reminders, and backups.

Press `Ctrl+K` or `/` to search, `N` to create a task, and `Esc` to close the current dialog.

## Code signing

These builds are unsigned. Windows may show an unknown publisher warning. Sign both executables with your own code signing certificate before distributing them to other users.
