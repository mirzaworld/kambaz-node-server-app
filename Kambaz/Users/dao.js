import { v4 as uuidv4 } from "uuid";

export default function UsersDao(db) {
	let { users } = db;

	const createUser = (user) => {
		const newUser = { ...user, _id: uuidv4() };
		users = [...users, newUser];
		db.users = users;
		return newUser;
	};

	const findAllUsers = () => users;

	const findUserById = (userId) => users.find((u) => u._id === userId);

	const findUserByUsername = (username) => users.find((u) => u.username === username);

	const findUserByCredentials = (username, password) =>
		users.find((u) => u.username === username && u.password === password);

	const updateUser = (userId, user) => {
		users = users.map((u) => (u._id === userId ? user : u));
		db.users = users;
		return user;
	};

	const deleteUser = (userId) => {
		const before = users.length;
		users = users.filter((u) => u._id !== userId);
		db.users = users;
		return users.length !== before;
	};

	return {
		createUser,
		findAllUsers,
		findUserById,
		findUserByUsername,
		findUserByCredentials,
		updateUser,
		deleteUser,
	};
}

