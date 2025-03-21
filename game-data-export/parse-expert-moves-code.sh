#!/bin/bash

# The game has a function that decides which expert moves a pokemon should be able to learn
# This converts the ruby code into js
code=$(sed -rn -e '/^\s*compatibleMoves << /{ s/:(\w+)/"\1"/g; s/compatibleMoves << ("\w+") if (.+)/if (\2) \{ move_names.push(\1); \}/p };' \
    input/infinitefusion-e18/Data/Scripts/052_AddOns/FusionMoveTutor.rb)

moves_list=$(echo $code | grep -Eo 'move_names.push\(("\w+")\)' | grep -Eo '".+"' | paste -d, -s)
echo "const expert_move_names = [$moves_list];"

echo "$code"


