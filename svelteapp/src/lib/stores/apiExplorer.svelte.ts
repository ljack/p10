/** Signal store to trigger API endpoint refresh */

class ApiExplorerStore {
	refreshCounter = $state(0);

	triggerRefresh() {
		this.refreshCounter++;
	}
}

export const apiExplorer = new ApiExplorerStore();
