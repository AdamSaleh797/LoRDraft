import { useState } from 'react';
import { Draft } from "./components/draft"
import { Route as AppRoute } from './types';
import { DARK_MODE_THEME, LIGHT_MODE_THEME } from './utils/constants';


function App() {
	return (
		<div>
			<Draft></Draft>
		</div>
	);
}

export default App;
