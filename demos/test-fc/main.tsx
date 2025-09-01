import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(0);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>]
			: [<li key="2">2</li>, <li key="1">1</li>];
	return (
		// <>
		// 	<div>1</div>
		// 	<div>2</div>
		// </>
		<ul
			onClickCapture={() => {
				setNum(num + 1);
			}}
		>
			<li>3</li>
			<li>4</li>
			{arr}
		</ul>
	);
}
function Child() {
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
