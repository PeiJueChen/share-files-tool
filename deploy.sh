# if ! [ -x "$(command -v git)" ]; then
#     echo 'Error: git is not installed.' >&2
#     exit 1
# fi

# if [[ -z $(git status -s) ]]; then
#     echo "tree is clean"
# else
#     echo -e "\033[36;1m tree is dirty, please commit changes before running this \033[0m"
#     exit 1
# fi


echo -e "\033[46;30m begin publish... \033[0m"
npm publish --access public

echo -e "\033[46;30m exec done \033[0m"