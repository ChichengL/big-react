import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(0);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>]
			: [<li key="2">2</li>, <li key="1">1</li>];
	return (
		<div
			onClick={() => {
				setNum((prev) => prev + 1);
				setNum((prev) => prev + 1);
				setNum((prev) => prev + 1);
			}}
		>
			{num}
		</div>
	);
}
function Child() {
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
